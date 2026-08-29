import { useState } from "react";
import { HiOutlineCheck, HiOutlineTrash, HiOutlinePencil, HiOutlineRefresh, HiOutlineChatAlt2 } from "react-icons/hi";

import { approveUser, deletePendingUser, deleteUser, restoreUser, updateUser } from "../../services/usersAPI";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import StyledSelect from "../common/StyledSelect";

const roles = ["OwnerManager", "Engineer", "Marketer", "MarketingManager", "ProductionManager"];

function UserRow({ user, reload, mode }) {
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({ name: user.name, phoneNumber: user.phoneNumber || "" });
  const { user: currentUser } = useAuth();
  const availableRoles = currentUser?.role === "OwnerManager" ? roles : [user.role];
  const isPending = mode === "pending";
  const isCurrentUser = String(currentUser?.id || currentUser?._id || "") === String(user._id);
  const whatsappUrl = user.phoneNumber ? `https://wa.me/${String(user.phoneNumber).replace(/\D/g, "")}` : null;
  const changeRole = async (nextRole) => {
    setRole(nextRole);
    if (nextRole === user.role) return;
    setSaving(true);
    try { await updateUser(user._id, { name: user.name, email: user.email, phoneNumber: user.phoneNumber, role: nextRole }); toast.success("Role updated."); await reload(); }
    catch (error) { setRole(user.role); toast.error(error?.response?.data?.message || "Unable to update the role."); }
    finally { setSaving(false); }
  };
  const saveProfile = async () => {
    if (!profile.name.trim()) return toast.error("Name is required.");
    setSaving(true);
    try { await updateUser(user._id, { name: profile.name.trim(), email: user.email, phoneNumber: profile.phoneNumber, role: user.role }); toast.success("User details updated."); setEditing(false); await reload(); }
    catch (error) { toast.error(error?.response?.data?.message || "Unable to update user details."); }
    finally { setSaving(false); }
  };
  const handleApprove = async () => {
    try {
      if (role !== user.role) await updateUser(user._id, { name: user.name, email: user.email, phoneNumber: user.phoneNumber, role });
      await approveUser(user._id);
      toast.success("User approved.");
      reload();
    } catch (error) { toast.error(error?.response?.data?.message || "Unable to approve user."); }
  };

  const handleDelete = async () => {
    try {
      if (isPending) await deletePendingUser(user._id); else await deleteUser(user._id);
      toast.success(isPending ? "Pending user deleted." : "The account has been moved to the Recycle Bin.");
      reload();
    } catch (error) { toast.error(error?.response?.data?.message || "Unable to delete user."); }
  };
  const handleRestore = async () => { try { await restoreUser(user._id); toast.success("User restored."); reload(); } catch (error) { toast.error(error?.response?.data?.message || "Unable to restore user."); } };

  return (
    <div className="users-row">
      <span>{user.name}{isCurrentUser && <small className="current-user-badge">This is you</small>}</span>

      <span>{user.email}</span>
      <span className="phone-value">{user.phoneNumber || "—"}</span>
      <div className="role-editor"><StyledSelect value={role} onChange={changeRole} disabled={user.isDeleted || saving || isCurrentUser || currentUser?.role !== "OwnerManager"} ariaLabel="دور المستخدم" options={availableRoles.map((item) => ({ value: item, label: item }))} /></div>

      <div className="users-actions">
        {!user.isDeleted && !isCurrentUser && <button type="button" className="edit-user-btn" onClick={() => setEditing(true)} aria-label="Edit user"><HiOutlinePencil /></button>}
        {whatsappUrl && !isCurrentUser && <a className="whatsapp-btn" href={whatsappUrl} target="_blank" rel="noreferrer" aria-label="Contact on WhatsApp"><HiOutlineChatAlt2 /></a>}
        {isPending && <button className="approve-btn" onClick={handleApprove} aria-label="Approve"><HiOutlineCheck /></button>}
        {user.isDeleted ? <button className="restore-btn" onClick={handleRestore} aria-label="Restore"><HiOutlineRefresh /></button> : !isCurrentUser && <button className="delete-btn" onClick={handleDelete} aria-label="Delete"><HiOutlineTrash /></button>}
      </div>
      {editing && <div className="user-edit-backdrop" role="dialog" aria-modal="true"><div className="user-edit-modal"><h2>Edit user</h2><p>Email address cannot be changed.</p><label>Full name<input value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} /></label><label>Phone number<input type="tel" value={profile.phoneNumber} onChange={(event) => setProfile((current) => ({ ...current, phoneNumber: event.target.value }))} placeholder="2010xxxxxxxx" /></label><div><button type="button" className="edit-cancel-btn" onClick={() => setEditing(false)} disabled={saving}>Cancel</button><button type="button" className="edit-save-btn" onClick={saveProfile} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button></div></div></div>}
    </div>
  );
}

export default UserRow;
