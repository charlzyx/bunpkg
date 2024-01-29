export const home = `
<!doctype html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>bunpkg</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace
    }

    a {
      color: #5753c6; var(--vocs-color_link);
      text-decoration: underline;
      transition: color .1s;
    }
  
    .content {
      max-width: 680px;
      margin: auto;
    }
  </style>
</head>

<body>
  <div class="content">
    <h1>BUNPKG</h1>
    <div> bunpkg is an alternative of <a href="https://unpkg.com" >unpkg.com</a>, powered by <a href="https://bun.sh">bun</a>! friendly for private deploy and file cache supported.  <a href="https://github.com/charlzyx/bunpkg">github</a></a>
    </div>
    <div id="doc">
      <h4><code>bunpkg.com/:package@:version/:file</code></h4>
      <div id="examples">
        <pre><code ><h2>Examples</h2>
  Using a fixed version:

  <a href="/react@16.7.0/umd/react.production.min.js">bunpkg.com/react@16.7.0/umd/react.production.min.js</a>
  <a href="/react-dom@16.7.0/umd/react-dom.production.min.js">bunpkg.com/react-dom@16.7.0/umd/react-dom.production.min.js</a>
  You may also use a semver range or a tag instead of a fixed version number, or omit the version/tag entirely to use
  the latest tag.

  <a href="/react@^16/umd/react.production.min.js">bunpkg.com/react@^16/umd/react.production.min.js</a>
  <a href="/react/umd/react.production.min.js">bunpkg.com/react/umd/react.production.min.js</a>
  If you omit the file path (i.e. use a “bare” URL), bunpkg will serve the file specified by the bunpkg field in
  package.json, or fall back to main.

  <a href="/jquery">bunpkg.com/jquery</a>
  <a href="/three">bunpkg.com/three</a>
  Append a / at the end of a URL to view a listing of all the files in a package.

  <a href="/react/">bunpkg.com/react/</a>
  <a href="/react-router/">bunpkg.com/react-router/</a></code></pre>
      </div>
      <div id="query">
        <pre><code><h2>Query Parameters</h2>
  ?meta
  Return metadata about any file in a package as JSON (e.g./any/file?meta)

  ?module
  Expands all “bare” import specifiers in JavaScript modules to bunpkg URLs. This feature is very experimental, for example ↓
  
  &lt;script type="module"  &gt;
    import min from "http://bunpkg.com/lodash-es@4.17.21/min.js?module"
  &lt;/script&gt;
</code></pre></div>
      </code></pre>
      </div>
    </div>
  </div>
  <script>
    const doc = document.querySelector("#doc");
    doc.innerHTML = doc.innerHTML.replace(/bunpkg/g, window.location.host)
  </script>
</body>

</html>
`;
export const err = (code: string, error: string) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>bunpkg</title>
  <style>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace
    }

    a {
      color: #5753c6; var(--vocs-color_link);
      text-decoration: underline;
      transition: color .1s;
    }
  
    .content {
      max-width: 680px;
      margin: auto;
    }
  </style>
  </style>
</head>

<body>
  <div class="content">
    <h1>ERROR</h1>
    <hr />
    <br />  
    <br />  
    <div><pre><code>${error}</code></pre></div>
    <hr />
    <br />  
    <a href="/">back to home</a>
  </div>
</body>
</html>
`;
};
