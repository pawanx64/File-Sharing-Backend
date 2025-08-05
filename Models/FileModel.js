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
        type:Number,
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
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    uploadTime: {
        type: Date,
        default: Date.now,
    },
});
module.exports=mongoose.model('FileModel',FileModelSchema);