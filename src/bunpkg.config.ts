export const BunPkgConfig = {
  /** 服务器相关 */
  server: {
    /**
     * 端口号
     * @default process.env.PORT || 4567
     */
    port: 4567,
    /**
     * 主机名
     * @default process.env.HOST || '0.0.0.0'
     */
    // host: "0.0.0.0",
    /**
     * 跨域配置
     * @default {origin:  process.env.CORS_ORIGIN } || Paramaters<typeof cors[0]>
     * @docuemnt see more https://elysiajs.com/plugins/cors.html#config
     */
    cors: {
      origin: "*",
    },
  },
  /** 缓存配置  */
  cache: {
    /**
     * 缓存硬盘占用空间最大值 (Gib)
     * @default process.env.CACHE_MAX_SIZE || 4
     */
    maxSize: 4,
    /**
     * 磁盘缓存目录位置
     * @default process.env.CACHE_DIR || '/cache'
     */
    dir: "/cache",
  },
  /** NPM 配置 */
  npm: {
    /**
     * 上游 NPM 源地址
     * @default process.env.NPM_REGISTRY || 'https://registry.npmjs.org/'
     */
    registry: "https://registry.npmjs.org/",
    /**
     * 私有 npm 认证头
     * Authorization: Bearer ${authToken}
     */
    // authToken: "",
    /**
     * 支持最大 npm tgz 压缩包尺寸 (mib)
     * @default 100 (Mib)
     * @default process.env.NPM_MAX_TGZ_SIZE || 100
     **/
    maxTgzSize: 100,
  },
  esm: {
    /**
     * ESM 前缀配置
     * @default process.env.ESM_ORIGIN
     */
    origin: "",
  },
  /**
   * 是否开启 JWT 认证, 只有有当前配置项并添加了 secret 的情况下才会开启
   *  seemore https://elysiajs.com/plugins/jwt.html
   */
  jwt: {
    //   /**
    //    * 认证密钥
    //    * @default process.env.JWT_SECRET
    //    **/
    //   secret: "",
  },
};
