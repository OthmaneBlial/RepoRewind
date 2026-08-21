import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const Icon = ({ children, ...props }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
)

export const PlayIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m9 7 8 5-8 5Z" fill="currentColor" stroke="none" />
  </Icon>
)
export const PauseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9 7v10M15 7v10" />
  </Icon>
)
export const UploadIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v5h14v-5" />
  </Icon>
)
export const FilmIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="5" width="18" height="14" rx="1" />
    <path d="M7 5v14M17 5v14M3 9h4m10 0h4M3 15h4m10 0h4" />
  </Icon>
)
export const ExpandIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5" />
  </Icon>
)
export const CloseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Icon>
)
export const ChevronIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m9 18 6-6-6-6" />
  </Icon>
)
export const BranchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="7" cy="5" r="2" />
    <circle cx="17" cy="7" r="2" />
    <circle cx="7" cy="19" r="2" />
    <path d="M7 7v10m2-5h3a5 5 0 0 0 5-3" />
  </Icon>
)
export const GithubIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3.3-.4 6.8-1.6 6.8-7A5.4 5.4 0 0 0 19.4 4 5 5 0 0 0 19.3.5S18.2.2 15 1.9a12 12 0 0 0-6 0C5.8.2 4.7.5 4.7.5A5 5 0 0 0 4.6 4a5.4 5.4 0 0 0-1.4 3.7c0 5.3 3.5 6.5 6.8 6.9A4.8 4.8 0 0 0 9 18v4" />
    <path d="M9 19c-3 .9-3-1.5-4.2-2" />
  </Icon>
)
export const LayersIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m12 3 9 5-9 5-9-5Z" />
    <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
  </Icon>
)
export const SparkIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m12 3 1.2 4.1a5 5 0 0 0 3.4 3.4l4.1 1.2-4.1 1.2a5 5 0 0 0-3.4 3.4L12 20.4l-1.2-4.1a5 5 0 0 0-3.4-3.4l-4.1-1.2 4.1-1.2a5 5 0 0 0 3.4-3.4Z" />
  </Icon>
)
export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Icon>
)
export const FileIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 3h8l4 4v14H6Z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </Icon>
)
export const CommitIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 12h5m8 0h5" />
    <circle cx="12" cy="12" r="4" />
  </Icon>
)
export const PersonIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
  </Icon>
)
export const TagIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m20 13-7 7L4 11V4h7Z" />
    <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
  </Icon>
)
export const PinIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m9 3 6 2-1 5 3 3-4 1-2 7-1-7-4-2 4-3Z" />
  </Icon>
)
export const CompareIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8 4 4 8l4 4M4 8h13M16 20l4-4-4-4m4 4H7" />
  </Icon>
)
export const ArrowIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 12h14m-5-5 5 5-5 5" />
  </Icon>
)
