export default function PdfPreview({ name, Panal }) {
  return (
    <div className="PdfPreview">
       <img src="/1.png" alt="PDF Preview" />
       <h2>{name}</h2>
       <h4>{Panal}</h4>
    </div>
  )
}