import UserRow from "./UserRow";

function UsersTable({
    users,
    loading,
    reload,
    mode = "pending"
}) {

    if (loading) {

        return (

            <div className="users-loading">

                Loading...

            </div>

        );

    }

    if (!users.length) {

        return (

            <div className="users-loading">{mode === "pending" ? "No Pending Users" : "No Users"}</div>

        );

    }

    return (

        <div className="users-table">

            <div className="users-table-header">

                <span>Name</span>

                <span>Email</span>
                <span>Phone</span>
                <span>Role</span>

                <span>Actions</span>

            </div>

            {

                users.map(user => (

                    <UserRow

                        key={user._id}

                        user={user}

                        reload={reload}
                        mode={mode}

                    />

                ))

            }

        </div>

    );

}

export default UsersTable;
