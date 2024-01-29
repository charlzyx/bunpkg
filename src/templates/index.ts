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
    <h1><a href="https://github.com/charlzyx/bunpkg">BUNPKG</a></h1>
    <div> bunpkg is an alternative of bunpkg, friendly for private deploy. </div>
    <div id="doc">
      <h2><code>bunpkg.com/:package@:version/:file</code></h2>
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
  Expands all “bare” import specifiers in JavaScript modules to bunpkg URLs. This feature is very experimental
          <div id="sayhi"><pre><code>  &lt;script type="module" &gt;</code></pre></div>
      </code></pre>
      </div>
    </div>
  </div>
  <script>
    const doc = document.querySelector("#doc");
    doc.innerHTML = doc.innerHTML.replace(/bunpkg/g, window.location.host)
  </script>
  <script type="module">
  import min from "/lodash-es@4.17.21/min.js?module"
    const hi = document.querySelector("#sayhi");
    setTimeout(() => {
      hi.innerHTML = "<pre><code>   <a>sayhi!</a> from script module i am " + window.location.host
      + "/lodash-es@4.17.21/min.js?module </code></pre>" 
    }, 1000)

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
