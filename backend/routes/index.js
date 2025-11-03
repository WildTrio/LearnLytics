const express=require('express');
const userRouter=require('./user');
const taskRouter=require("./tasks")
const router=express.Router()

router.use('/user',userRouter)
router.use('/tasks',taskRouter)
module.exports=router;