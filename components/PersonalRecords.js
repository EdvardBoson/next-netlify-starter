function formatNumber(n) {
  return n.toLocaleString('sv-SE', { maximumFractionDigits: 1 })
}

export default function PersonalRecords({ records }) {
  if (records.length === 0) {
    return <p className="empty">Dina personbästa visas här när du har loggat några pass.</p>
  }

  return (
    <div className="card table-wrap">
      <table className="records">
        <thead>
          <tr>
            <th>Övning</th>
            <th>Tyngsta set</th>
            <th>Uppsk. 1RM</th>
            <th>Pass</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.name}>
              <td>{record.name}</td>
              <td>
                {formatNumber(record.maxWeight)} kg × {record.maxWeightReps}
                <div className="muted small">{record.maxWeightDate}</div>
              </td>
              <td>{formatNumber(record.bestOneRm)} kg</td>
              <td>{record.sessions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
