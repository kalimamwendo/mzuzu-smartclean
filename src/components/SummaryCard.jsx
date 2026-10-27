import './SummaryCard.css'

export default function SummaryCard({
  title,
  value,
  icon: Icon,
  description,
  color = 'green',
}) {
  return (
    <article className="summary-card">
      <div className="summary-card-top">
        <div>
          <p className="summary-card-title">{title}</p>
          <h2 className="summary-card-value">{value}</h2>
        </div>

        <div className={`summary-card-icon ${color}`}>
          {Icon && <Icon size={23} strokeWidth={2} />}
        </div>
      </div>

      <p className="summary-card-description">{description}</p>
    </article>
  )
}
