import { useEffect, useState } from "react";

import DashboardLayout from "../components/layout/DashboardLayout";

import UsersHeader from "../components/users/UsersHeader";
import UsersTable from "../components/users/UsersTable";
import { getUsers } from "../services/usersAPI";
import { showApiErrorToast } from "../utils/errorToast";

import "../styles/users.css";

function Users() {
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      const { data } = await getUsers();
      setUsers(
        Array.isArray(data)
          ? data.filter((user) => user.approved && !user.isDeleted)
          : [],
      );
    } catch (error) {
      showApiErrorToast(error, "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();

    return undefined;
  }, []);

  return (
    <DashboardLayout notAllowed={true}>
      <UsersHeader mode="users" />

      <UsersTable
        users={users}
        loading={loading}
        reload={loadUsers}
        mode="users"
      />
    </DashboardLayout>
  );
}

export default Users;
