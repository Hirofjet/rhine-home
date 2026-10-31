这是示例附件文件。

把需要提供下载的本地文件放进 public/downloads/ 目录，
然后在 ArticleBlock 的 downloads 里填写文件名即可：

  downloads={[
    { label: '示例附件：纯文本说明', file: 'sample-readme.txt', size: '1 KB' },
  ]}

文件会原样复制到构建产物中，链接地址为 /downloads/文件名。
