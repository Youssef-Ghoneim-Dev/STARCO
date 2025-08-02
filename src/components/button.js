export default function Button({class_pram,text, onClick,children,id}) {
    return(
        <button className={class_pram} onClick={onClick} id={id}>
            {text}
            {children}
        </button>
    )
}