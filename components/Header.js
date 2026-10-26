export default function Header({ title, subtitle }) {
  return (
    <header className="header">
      <h1 className="title">{title}</h1>
      {subtitle && <p className="description">{subtitle}</p>}
    </header>
  )
}
