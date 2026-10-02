import { useEffect, useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import UsersHeader from "../components/users/UsersHeader";
import UsersTable from "../components/users/UsersTable";
import { getPendingUsers } from "../services/usersAPI";
import { showApiErrorToast } from "../utils/errorToast";
import "../styles/users.css";

function PendingUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const loadUsers = async () => {
    try {
      const { data } = await getPendingUsers();
      setUsers(data);
    } catch (error) {
      showApiErrorToast(error, "Failed to load pending users.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadUsers();
  }, []);
  return (
    <DashboardLayout notAllowed>
      <UsersHeader />
      <UsersTable
        users={users}
        loading={loading}
        reload={loadUsers}
        mode="pending"
      />
    </DashboardLayout>
  );
}

export default PendingUsers;
