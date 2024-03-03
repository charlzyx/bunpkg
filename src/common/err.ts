export const erros = {
  // 解析 url path 失败
  ParsePathError: 403,
};

export const err = (...labels: (string | undefined)[]) => {
  const msg = labels.pop();

  return new Error(`${labels.join(" - ")}:: ${msg ?? ""}`);
};
