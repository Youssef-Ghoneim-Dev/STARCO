export default function Button({class_pram,text, onClick,children}) {
    return(
        <button className={class_pram} onClick={onClick}>
            {text}
            {children}
        </button>
    )
}