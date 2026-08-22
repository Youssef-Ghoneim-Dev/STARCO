function DashboardHeader({ name }) {
  return (
    <header className="dashboard-header">
      <div>
        <h1>لوحة التحكم</h1>
        <p>{name ? `مرحبًا ${name}، هذه نظرة سريعة على العمل اليوم.` : "نظرة سريعة على المشاريع والعمل اليوم."}</p>
      </div>
    </header>
  );
}

export default DashboardHeader;
