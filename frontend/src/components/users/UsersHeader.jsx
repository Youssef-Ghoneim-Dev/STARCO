function UsersHeader({ mode = "pending" }) {
  return (
    <div className="users-header">
      <h1>{mode === "pending" ? "Pending Users" : "Users"}</h1>
      <p>{mode === "pending" ? "Review registrations before granting access." : "Manage approved and deleted users."}</p>
    </div>
  );
}

export default UsersHeader;
