const express=require('express');
const multer = require('multer');
const FileModel = require('../Models/FileModel');
const router=express.Router();
const cloudinary=require("cloudinary").v2;


const storage = multer.diskStorage({})

let upload = multer({ storage });


router.post('/upload', upload.single('file'), async(req, res) => {
    try{
      if(!req.file)
      {
         return res.status(400).json({
            message: "We Need The File",
         });
      }
      console.log(req.file);
      let uploadedFile;
      try{
        uploadedFile=await cloudinary.uploader.upload(req.file.path,{
                folder:"File Sharing",
                resource_type:"auto"
          })
      }
      catch(error){
            console.log(error.message);
            return res.status(400).json({
               message:"Cloudinary Error " + error.message,
            })
      }
      const { originalname }=req.file;
      const { secure_url,bytes }=uploadedFile;
      try{
        const file=await FileModel.create({
          filename: originalname,
          sizeInBytes :bytes,
          secure_url,
        });
        res.status(200).json({
          id:file._id ,
        });
      }
      catch(error){
        console.log(error.message);
            return res.status(500).json({
                message: "Error saving file record",
            });
      }
    }
    catch(error){
        console.log(error.message);
        res.status(500).json({
          message:"Server Error",
        });
    }
    
});

router.get('/:id',async(req,res)=>{
  try{
    const fileId = req.params.id;
    const file = await FileModel.findById(fileId);
    
    if (!file) {
        return res.status(404).json({ error: 'File not found' });
    }
    const fileUrl = `${process.env.DATABASE_URL}/${file._id}`;
    res.json({ file, fileUrl });
}
catch(error){
    console.error('Error fetching file:', error);
    res.status(500).json({ error: 'Internal Server Error' });
}
});

module.exports=router;