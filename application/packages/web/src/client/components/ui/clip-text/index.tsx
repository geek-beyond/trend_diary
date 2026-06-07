import { twMerge } from 'tailwind-merge'

type Props = {
  className?: string
  text: string
}

export function ClipText({ text, className }: Props) {
  const classes = twMerge(
    'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block',
    className,
  )

  return <span className={classes}>{text}</span>
}
