const mongoose=require("mongoose");

const FileModelSchema=new mongoose.Schema({
    filename:{
        type:String,
        required:true,
    },
    secure_url:{
        type:String,
        required:true,
    },
    sizeInBytes:{
        type:String,
        required:true,
    },
    sender:{
        type:String,
        required:false,
    },
    receiver:{
        type:String,
        required:false,
    },
});
module.exports=mongoose.model('FileModel',FileModelSchema);