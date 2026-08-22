function UserAvatar({ name = "" }) {
  const firstLetter = name.trim().charAt(0).toUpperCase();

  return <div className="user-avatar">{firstLetter}</div>;
}

export default UserAvatar;
