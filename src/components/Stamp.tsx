interface StampProps {
  label: string
  date: string
}

export function Stamp({ label, date }: StampProps) {
  return (
    <div className="stamp">
      <span className="s-top">{label}</span>
      <span className="s-date mono">{date}</span>
    </div>
  )
}
