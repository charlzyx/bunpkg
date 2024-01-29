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
