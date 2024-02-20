import gunzip from "gunzip-maybe";
import type { IncomingMessage } from "http";
import nodepath from "path";
import type { Transform } from "stream";
import tar from "tar-stream";
import { IFileMeta, getContentType, getIntegrity } from "./content";

export const promiseifyStream = (stream: Transform | IncomingMessage) => {
  return new Promise<any>((resolve, reject) => {
    const chunks: any[] = [];

    stream
      .on("error", reject)
      .on("data", (chunk) => chunks.push(chunk))
      .on("end", () => resolve(Buffer.concat(chunks)));
  });
};

/**
 * Search the given tarball for entries that match the given name.
 * Follows node's resolution algorithm.
 * https://nodejs.org/api/modules.html#modules_all_together
 */
export const search = async (tarball: IncomingMessage, filename: string) => {
  // filename = /some/file/name.js or /some/dir/name
  type SearchResult = {
    foundEntry: IFileMeta;
    matchingEntries: Record<string, IFileMeta>;
    tried: string[];
  };
  return new Promise<SearchResult>((accept, reject) => {
    const jsEntryFilename = `${filename}.js`;
    const jsonEntryFilename = `${filename}.json`;

    const matchingEntries: SearchResult["matchingEntries"] = {};
    let foundEntry: SearchResult["foundEntry"];

    if (filename === "/") {
      foundEntry = matchingEntries["/"] = { name: "/", type: "directory" };
    }
    const tried: string[] = [];

    tarball
      .pipe(gunzip())
      .pipe(tar.extract())

      .on("error", reject)
      .on("entry", async (header, stream, next) => {
        const entry: SearchResult["foundEntry"] = {
          // Most packages have header names that look like `package/index.js`
          // so we shorten that to just `index.js` here. A few packages use a
          // prefix other than `package/`. e.g. the firebase package uses the
          // `firebase_npm/` prefix. So we just strip the first dir name.
          path: header.name.replace(/^[^/]+/g, ""),
          type: header.type,
        };

        tried.push(`[${entry.type ?? ""}]  ${entry.path}`);
        // Skip non-files and files that don't match the entryName.
        if (entry.type !== "file" || !entry?.path?.startsWith(filename)) {
          stream.resume();
          stream.on("end", next);
          return;
        }

        matchingEntries[entry.path] = entry;

        // Dynamically create "directory" entries for all directories
        // that are in this file's path. Some tarballs omit these entries
        // for some reason, so this is the "brute force" method.
        let dir = nodepath.dirname(entry.path);
        while (dir !== "/") {
          if (!matchingEntries[dir]) {
            matchingEntries[dir] = { name: dir, type: "directory" };
          }
          dir = nodepath.dirname(dir);
        }

        if (
          entry.path === filename ||
          // Allow accessing e.g. `/index.js` or `/index.json`
          // using `/index` for compatibility with npm
          entry.path === jsEntryFilename ||
          entry.path === jsonEntryFilename
        ) {
          if (foundEntry) {
            if (
              foundEntry.path !== filename &&
              (entry.path === filename ||
                (entry.path === jsEntryFilename &&
                  foundEntry.path === jsonEntryFilename))
            ) {
              // This entry is higher priority than the one
              // we already found. Replace it.
              delete foundEntry.content;
              foundEntry = entry;
            }
          } else {
            foundEntry = entry;
          }
        }

        try {
          const content = await promiseifyStream(stream);

          entry.contentType = getContentType(entry.path);
          entry.integrity = getIntegrity(content);
          entry.lastModified = header.mtime?.toUTCString();
          entry.size = content.length;

          // Set the content only for the foundEntry and
          // discard the buffer for all others.
          if (entry === foundEntry) {
            entry.content = content;
          }

          next();
        } catch (error) {
          next(error);
        }
      })
      .on("finish", () => {
        accept({
          // If we didn't find a matching file entry,
          // try a directory entry with the same name.
          foundEntry: foundEntry || matchingEntries[filename] || null,
          matchingEntries: matchingEntries,
          tried,
        });
      });
  });
};

/** for file */
export const findMatchEntry = (
  tarball: IncomingMessage,
  /**
   * filename = /some/file/name.js
   */
  filename: string,
) => {
  return new Promise((accept, reject) => {
    let foundEntry: IFileMeta | null = null;

    tarball
      .pipe(gunzip())
      .pipe(tar.extract())
      .on("error", reject)
      .on("entry", async (header, stream, next) => {
        const entry: IFileMeta = {
          // Most packages have header names that look like `package/index.js`
          // so we shorten that to just `/index.js` here. A few packages use a
          // prefix other than `package/`. e.g. the firebase package uses the
          // `firebase_npm/` prefix. So we just strip the first dir name.
          path: header.name.replace(/^[^/]+\/?/, "/"),
          type: header.type,
        };

        // Ignore non-files and files that don't match the name.
        if (entry.type !== "file" || entry.path !== filename) {
          stream.resume();
          stream.on("end", next);
          return;
        }

        try {
          const content = await promiseifyStream(stream);

          entry.contentType = getContentType(entry.path);
          entry.integrity = getIntegrity(content);
          entry.lastModified = header.mtime?.toUTCString();
          entry.size = content.length;

          foundEntry = entry;

          next();
        } catch (error) {
          next(error);
        }
      })
      .on("finish", () => {
        accept(foundEntry);
      });
  });
};

/**
 * for dir
 */
export const findMatchEntries = (
  tarboll: IncomingMessage,
  /**
   * filename = /some/dir/name
   */
  filename: string,
) => {
  return new Promise<Record<string, IFileMeta>>((accept, reject) => {
    const entries: Record<string, IFileMeta> = {};

    entries[filename] = { path: filename, type: "directory" };

    tarboll
      .pipe(gunzip())
      .pipe(tar.extract())
      .on("error", reject)
      .on("entry", async (header, stream, next) => {
        const entry: IFileMeta = {
          // Most packages have header names that look like `package/index.js`
          // so we shorten that to just `/index.js` here. A few packages use a
          // prefix other than `package/`. e.g. the firebase package uses the
          // `firebase_npm/` prefix. So we just strip the first dir name.
          path: header.name.replace(/^[^/]+\/?/, "/"),
          type: header.type,
        };

        // Dynamically create "directory" entries for all subdirectories
        // in this entry's path. Some tarballs omit directory entries for
        // some reason, so this is the "brute force" method.
        let dir = nodepath.dirname(entry.path!);
        while (dir !== "/") {
          if (!entries[dir] && dir.startsWith(filename)) {
            entries[dir] = { path: dir, type: "directory" };
          }
          dir = nodepath.dirname(dir);
        }

        // Ignore non-files and files that don't match the prefix.
        if (entry.type !== "file" || !entry.path?.startsWith(filename)) {
          stream.resume();
          stream.on("end", next);
          return;
        }

        try {
          const content = await promiseifyStream(stream);

          entry.contentType = getContentType(entry.path);
          entry.integrity = getIntegrity(content);
          entry.lastModified = header.mtime?.toUTCString();
          entry.size = content.length;

          entries[entry.path] = entry;

          next();
        } catch (error) {
          next(error);
        }
      })
      .on("finish", () => {
        accept(entries);
      });
  });
};

export const findEntryInEntries = (
  entry: IFileMeta,
  entries: Record<string, IFileMeta>,
) => {
  const metadata: IFileMeta = { path: entry.path, type: entry.type };

  if (entry.type === "file") {
    metadata.contentType = entry.contentType;
    metadata.integrity = entry.integrity;
    metadata.lastModified = entry.lastModified;
    metadata.size = entry.size;
  } else if (entry.type === "directory") {
    metadata.files = Object.keys(entries)
      .filter(
        (key) => entry.path !== key && nodepath.dirname(key) === entry.path,
      )
      .map((key) => entries[key])
      .map((e) => findEntryInEntries(e, entries));
  }

  return metadata;
};
