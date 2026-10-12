/**
 * 手绘线条风内联 SVG 图标。
 * 统一规则：stroke 用 currentColor，宽 2，round 端点，路径带轻微抖动。
 * 不用 SVG filter，方便以后移植微信小程序。
 */

interface IconProps {
  size?: number
  className?: string
}

function svgProps(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  }
}

/** 向上箭头（进「偷」页的大按钮里用） */
export function IconArrowUp({ size = 28, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 20 C11.6 15 11.8 10 12 5" />
      <path d="M6.5 10 C8 8 10 6.2 12 4.5 C14 6.2 16 8 17.5 10" />
    </svg>
  )
}

/** 向下箭头（从偷页回首页） */
export function IconArrowDown({ size = 28, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 4 C11.6 9 11.8 14 12 19" />
      <path d="M6.5 14 C8 16 10 17.8 12 19.5 C14 17.8 16 16 17.5 14" />
    </svg>
  )
}

/** 返回箭头（←） */
export function IconArrowLeft({ size = 22, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M20 12 C15 11.6 9 11.8 4 12" />
      <path d="M9.5 6.5 C7.5 8 5.8 10 4.2 12 C6 14 7.8 15.8 9.5 17.5" />
    </svg>
  )
}

/** 小花 / 星（回看图标之一） */
export function IconFlower({ size = 26, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 12 L12 4.2 M12 12 L18.5 8 M12 12 L18.8 15.5 M12 12 L12.2 19.6 M12 12 L5.2 15.8 M12 12 L5.4 8.2" />
    </svg>
  )
}

/** 小树（回看图标之二） */
export function IconTree({ size = 26, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 20.5 C11.9 17 12 14 12 11" />
      <path d="M12 3.5 C14.8 6 16.4 8 16.2 10.4 C16 12.6 14.2 13.8 12 13.8 C9.8 13.8 8 12.6 7.8 10.4 C7.6 8 9.2 6 12 3.5 Z" />
    </svg>
  )
}

/** 空心手绘圆圈（未用时） */
export function IconCircle({ size = 30, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 3.2 C17 3 20.6 6.8 20.6 11.6 C20.6 16.6 16.8 20.6 11.8 20.7 C7 20.8 3.4 17 3.4 12.2 C3.4 7.2 7.2 3.4 12 3.2 Z" />
    </svg>
  )
}

/** 笑脸（= 今天用上了） */
export function IconSmile({ size = 30, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 3.2 C17 3 20.6 6.8 20.6 11.6 C20.6 16.6 16.8 20.6 11.8 20.7 C7 20.8 3.4 17 3.4 12.2 C3.4 7.2 7.2 3.4 12 3.2 Z" />
      <path d="M8.4 9.6 C8.8 9.4 9.4 9.4 9.8 9.6" />
      <path d="M14.2 9.6 C14.6 9.4 15.2 9.4 15.6 9.6" />
      <path d="M8.2 14 C9.6 16 14.4 16 15.8 14" />
    </svg>
  )
}

/** 太阳（回看图标之三，备用） */
export function IconSun({ size = 26, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 15.4 C13.9 15.3 15.3 13.8 15.3 12 C15.3 10.1 13.8 8.7 12 8.7 C10.1 8.7 8.7 10.2 8.7 12 C8.7 13.9 10.2 15.3 12 15.4 Z" />
      <path d="M12 2.8 L12 5 M12 19 L12 21.2 M3.4 12 L5.6 12 M18.4 12 L20.6 12 M5.2 5.2 L6.8 6.8 M17.2 17.2 L18.8 18.8 M18.8 5.2 L17.2 6.8 M6.8 17.2 L5.2 18.8" />
    </svg>
  )
}

/** 「更多」：三个手绘点 */
export function IconMore({ size = 22, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M5.5 12 L5.6 12.1" strokeWidth={3} />
      <path d="M12 12 L12.1 12.1" strokeWidth={3} />
      <path d="M18.5 12 L18.6 12.1" strokeWidth={3} />
    </svg>
  )
}

/** 关闭 ×（手绘两笔） */
export function IconClose({ size = 22, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M5.5 5.8 C10 10 14 14.2 18.4 18.4" />
      <path d="M18.2 5.5 C14 9.8 9.8 14 5.6 18.2" />
    </svg>
  )
}

/** 手（手填入口的小图标） */
export function IconHand({ size = 20, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M8 20 C6.5 18 5.2 15.5 5 13 C4.9 12 6 11.6 6.6 12.3 L8 14 L8 5.5 C8 4.2 9.8 4.2 9.8 5.5 L9.8 11 L10.4 11 L10.4 4.2 C10.4 3 12.1 3 12.1 4.2 L12.1 11 L12.8 11 L12.8 5 C12.8 3.8 14.5 3.8 14.5 5 L14.5 11.2 L15.2 11.2 L15.2 6.8 C15.2 5.6 16.9 5.6 16.9 6.8 L16.9 14.5 C16.9 17 15.8 18.8 14.5 20.2" />
    </svg>
  )
}
