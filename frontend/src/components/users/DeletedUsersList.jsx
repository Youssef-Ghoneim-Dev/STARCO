import { useEffect, useState } from "react";
import { HiOutlineRefresh, HiOutlineTrash } from "react-icons/hi";
import toast from "react-hot-toast";
import {
  getDeletedUsers,
  permanentlyDeleteUser,
  restoreUser,
} from "../../services/usersAPI";
import { useActivityAction } from "../common/activity/ActivityContext";
import { showApiErrorToast } from "../../utils/errorToast";

function DeletedUsersList() {
  const runActivity = useActivityAction();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState(null);
  const [busyId, setBusyId] = useState("");
  const loadUsers = async () => {
    try {
      const { data } = await getDeletedUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      showApiErrorToast(error, "تعذر تحميل المستخدمين المحذوفين.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadUsers();
  }, []);
  const restore = async (user) => {
    setBusyId(user._id);
    try {
      const operation = await runActivity(
        `restore-deleted-user-${user._id}`,
        {
          title: "استعادة المستخدم",
          message: "يتم استعادة الحساب...",
          type: "save",
          successMessage: "تمت استعادة المستخدم.",
          errorMessage: "تعذرت استعادة المستخدم.",
        },
        () => restoreUser(user._id),
      );
      if (operation.skipped) return;
      setUsers((current) => current.filter((item) => item._id !== user._id));
      if (!operation.visible) toast.success("تمت استعادة المستخدم.");
    } catch (error) {
      showApiErrorToast(error, "تعذرت استعادة المستخدم.");
    } finally {
      setBusyId("");
    }
  };
  const removeForever = async () => {
    if (!target) return;
    setBusyId(target._id);
    try {
      const operation = await runActivity(
        `permanently-delete-user-${target._id}`,
        {
          title: "حذف المستخدم نهائيًا",
          message: "يتم حذف الحساب نهائيًا...",
          type: "delete",
          successMessage: "تم حذف المستخدم نهائيًا.",
          errorMessage: "تعذر حذف المستخدم نهائيًا.",
        },
        () => permanentlyDeleteUser(target._id),
      );
      if (operation.skipped) return;
      setUsers((current) => current.filter((item) => item._id !== target._id));
      setTarget(null);
      if (!operation.visible) toast.success("تم حذف المستخدم نهائيًا.");
    } catch (error) {
      showApiErrorToast(error, "تعذر حذف المستخدم نهائيًا.");
    } finally {
      setBusyId("");
    }
  };
  if (loading) return <p className="management-empty">جاري التحميل...</p>;
  if (!users.length)
    return <p className="management-empty">لا يوجد مستخدمون محذوفون.</p>;
  return (
    <>
      <div className="management-list">
        {users.map((user) => (
          <article className="management-row" key={user._id}>
            <div>
              <h2>{user.name}</h2>
              <p>
                {user.email} · {user.role} ·{" "}
                {user.phoneNumber || "بدون رقم هاتف"}
              </p>
            </div>
            <div className="recycle-bin-actions">
              <button
                type="button"
                onClick={() => restore(user)}
                disabled={Boolean(busyId)}
              >
                <HiOutlineRefresh />
                استعادة
              </button>
              <button
                type="button"
                className="permanent-delete-btn"
                onClick={() => setTarget(user)}
                disabled={Boolean(busyId)}
              >
                <HiOutlineTrash />
                حذف نهائي
              </button>
            </div>
          </article>
        ))}
      </div>
      {target && (
        <div
          className="management-modal-backdrop"
          role="dialog"
          aria-modal="true"
        >
          <div className="management-modal delete-project-confirmation">
            <div className="management-modal-heading">
              <h2>حذف المستخدم نهائيًا</h2>
            </div>
            <p>
              سيتم حذف المستخدم <strong>{target.name}</strong> نهائيًا، ولا يمكن
              استعادته بعد ذلك.
            </p>
            <div className="management-confirmation-actions">
              <button
                type="button"
                className="management-cancel-btn"
                onClick={() => setTarget(null)}
                disabled={Boolean(busyId)}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="permanent-delete-btn"
                onClick={removeForever}
                disabled={Boolean(busyId)}
              >
                حذف نهائيًا
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DeletedUsersList;
