const Footer = () => {

  return (
    <div>
      <footer className="w-full bg-[#bfdbfe] px-6 py-4 flex justify-end items-center mt-auto">
        <div className="text-right text-gray-800 text-sm leading-tight">
          <p className="font-semibold">Walailak University</p>
          <p>Innovation of Medical Informatics</p>
          <p className="mt-1 text-xs">
            Copyright © {new Date().getFullYear()} - All rights reserved by BookLab
          </p>
        </div>
      </footer>
    </div>
  )

}

export default Footer