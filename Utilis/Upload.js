const multer=require("multer");

const Upload=multer({dest:'Uploads'})

module.exports=Upload;