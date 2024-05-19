import { marked } from 'marked'
import puppeteer from 'puppeteer-core'
import fs from 'node:fs/promises'
import path from 'node:path'

class Options {
  /** markdown 文件绝对路径 */
  src: string
  /** pdf 文件绝对路径 */
  out: string
  /** 是否输出 html */
  outputHTML: boolean
  /** 自定义浏览器 */
  browser: string
  /** 显示文件名 */
  showTitle: boolean
  /** 正确格式 */
  static format = 'mdpdf --src=xxx [--out=xxx] [--outputHTML] [--browser=xxx] [--showTitle]'
  /**
   * 生成应用参数
   * @param args 命令行参数
   * @param cwd 当前工作目录
   */
  constructor(args: string[], cwd: string) {
    // 默认参数
    this.src = ''
    this.out = ''
    this.outputHTML = false
    this.showTitle = false
    this.browser = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    // 解析参数
    args.forEach(arg => {
      switch (arg.split('=')[0]) {
        case '--src': {
          const a = arg.split('=')
          if (a.length !== 2 || a[1] === '') throw SyntaxError()
          this.src = a[1].endsWith('.md') ? path.resolve(cwd, a[1]) : path.resolve(cwd, a[1] + '.md')
          break
        }
        case '--out': {
          const a = arg.split('=')
          if (a.length !== 2 || a[1] === '') throw SyntaxError()
          this.out = a[1].endsWith('.pdf') ? path.resolve(cwd, a[1]) : path.resolve(cwd, a[1] + '.pdf')
          break
        }
        case '--outputHTML': {
          this.outputHTML = true
          break
        }
        case '--showTitle': {
          this.showTitle = true
          break
        }
        case '--browser': {
          const a = arg.split('=')
          if (a.length !== 2 || a[1] === '') throw SyntaxError()
          this.browser = a[1]
          break
        }
        default: {
          throw SyntaxError()
        }
      }
    })
    // 检查参数
    if (this.src === '') throw SyntaxError()
    if (this.out === '') this.out = this.src.replace('.md', '.pdf')
  }
}

/**
 * 主函数
 * @param args 命令行参数
 * @param cwd 当前工作目录
 */
export async function main(args: string[], cwd: string): Promise<void> {

  try {
    // 解析参数
    const options = new Options(args, cwd)
    console.log('\n开始生成\n')
    // 渲染 markdown
    await renderMarkdown(options)
    console.log('生成成功\n')

  } catch (e) {
    if (e instanceof SyntaxError) console.error('\n参数错误, 正确格式:\nmdpdf --src=xxx [--out=xxx] [--outputHTML] [--browser=xxx]\n')
    else if (e instanceof Error) console.error(`\n未知错误, 错误信息:\n${e.name}\n${e.message}\n`)

  } finally {
    process.exit(0)

  }
}

/**
 * 渲染 markdown
 * @param options 参数
 */
async function renderMarkdown(options: Options): Promise<void> {
  // 读取 markdown 文件
  const md = await fs.readFile(options.src, { encoding: 'utf-8' })
  // 转换 markdown 为 html
  const html = await marked(md)
  // 读取 css 文件
  const css = await fs.readFile(path.resolve(import.meta.dir, '../css/APS.css'))
  // 创建网页文件
  const title = path.basename(options.src).replace('.md', '')
  const web = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>${css}</style>
    </head>
    <body>
      ${html}
    </body>
    </html>
  `
  // 保存 html 文件
  options.outputHTML && await fs.writeFile(options.src.replace('.md', '.html'), web)
  // 创建浏览器
  const browser = await puppeteer.launch({ executablePath: options.browser })
  // 创建页面
  const page = await browser.newPage()
  // 设置页面内容
  await page.setContent(web)
  // 生成 pdf
  await page.pdf({ 
    path: options.out,
    format: 'A4',
    margin: { 
      top: '2cm', 
      right: '2.5cm', 
      bottom: '2cm', 
      left: '2.5cm' 
    },
    displayHeaderFooter: true,
    headerTemplate: options.showTitle ? `<div style="font-size: 9px; font-family: '宋体'; color: #333; padding: 5px; margin-left: 0.6cm;"> <span class="title"></span> </div>` : `<div></div>`,
    footerTemplate: `<div style="font-size: 9px; font-family: '宋体'; color: #333; padding: 5px; margin: 0 auto;">第 <span class="pageNumber"></span> 页 / 共 <span class="totalPages"></span> 页</div>`,
  })
  // 关闭浏览器
  await browser.close()
}