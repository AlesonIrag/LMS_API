const express=require('express');

const router=express.Router();
const bcrypt=require('bcryptjs');


const jwt=require('jsonwebtoken');
const db=require('../config/database');
const {validateStudentRegistration,validateStudentUpdate,validateStudentId}=require('../middleware/validation');
const {asyncHandler}=require('../middleware/errorHandler');


const JWT_SECRET=process.env.JWT_SECRET||'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN=process.env.JWT_EXPIRES_IN||'24h';

const generateStudentToken=(student)=>{
return jwt.sign({studentId:student.StudentID,fullName:student.FullName,email:student.Email,type:'student'},JWT_SECRET,{expiresIn:JWT_EXPIRES_IN});
};

const validateStudentLogin=(req,res,next)=>{
const {studentId,password}=req.body;
if(!studentId||!password){
return res.status(400).json({success:false,error:'❌ Student ID and password are required'});
}
const studentIdPattern=/^[0-9]{4}-[0-9]{5}$/;
if(!studentIdPattern.test(studentId)){
return res.status(400).json({success:false,error:'❌ Invalid student ID format. Expected format: YYYY-NNNNN'});
}
next();
};

router.post('/register-student',validateStudentRegistration,asyncHandler(async(req,res)=>{
let {studentID,fullName,course,yearLevel,section,email,phoneNumber,password}=req.body;


course=course?.trim()!==''?course:'N/A';
section=section?.trim()!==''?section:'N/A';
phoneNumber=phoneNumber?.trim()!==''?phoneNumber:'N/A';
yearLevel=yearLevel&&!isNaN(yearLevel)?parseInt(yearLevel):0;

const hashedPassword=await bcrypt.hash(password,10);

const handleInsert=async(idToUse)=>{
const insertQuery=`INSERT INTO Students (StudentID, FullName, Course, YearLevel, Section, Email, PhoneNumber, Password, EnrollmentStatus, AccountStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', 'Allowed')`;
const [result]=await db.execute(insertQuery,[idToUse,fullName,course,yearLevel,section,email,phoneNumber,hashedPassword]);
res.status(201).json({success:true,message:'✅ Student registered successfully',data:{studentID:idToUse,fullName,course,yearLevel,section,email,phoneNumber}});
};

if(studentID){
const checkQuery=`SELECT StudentID FROM Students WHERE StudentID = ?`;
const [existingStudent]=await db.execute(checkQuery,[studentID]);
if(existingStudent.length>0){
return res.status(409).json({success:false,error:'❌ Student ID already exists. Please use a different ID.'});
}
await handleInsert(studentID);
}else{
const generateUniqueStudentID=async()=>{
const currentYear=new Date().getFullYear();
let sequence=1;
let newStudentID;
let isUnique=false;
while(!isUnique){
newStudentID=`${currentYear}-${String(sequence).padStart(5,'0')}`;
const checkQuery=`SELECT StudentID FROM Students WHERE StudentID = ?`;
const [existingStudent]=await db.execute(checkQuery,[newStudentID]);
if(existingStudent.length===0){
isUnique=true;
}else{
sequence++;
}
}
return newStudentID;
};
const newStudentID=await generateUniqueStudentID();
await handleInsert(newStudentID);
}
}));

router.post('/login-student',validateStudentLogin,asyncHandler(async(req,res)=>{
const {studentId,password}=req.body;
const selectQuery=`SELECT * FROM Students WHERE StudentID = ?`;
const [results]=await db.execute(selectQuery,[studentId]);
if(results.length===0){
return res.status(401).json({success:false,error:'❌ Invalid credentials'});
}
const student=results[0];
if(student.AccountStatus!=='Allowed'){
return res.status(403).json({success:false,error:`❌ Account not allowed. Status: ${student.AccountStatus}`});
}
const isPasswordValid=await bcrypt.compare(password,student.Password);
if(!isPasswordValid){
return res.status(401).json({success:false,error:'❌ Invalid credentials'});
}
const token=generateStudentToken(student);
res.json({success:true,message:'✅ Login successful',token,data:{studentID:student.StudentID,fullName:student.FullName,email:student.Email}});
}));

router.put('/update-student/:studentID',validateStudentUpdate,asyncHandler(async(req,res)=>{
const {studentID}=req.params;
const {fullName,course,yearLevel,section,email,phoneNumber,password,enrollmentStatus,accountStatus}=req.body;
const checkQuery=`SELECT * FROM Students WHERE StudentID = ?`;
const [results]=await db.execute(checkQuery,[studentID]);
if(results.length===0){
return res.status(404).json({success:false,error:'❌ Student not found'});
}
const currentStudent=results[0];
let updateQuery=`UPDATE Students SET `;
let queryParams=[];
let updateFields=[];
if(fullName){updateFields.push('FullName = ?');queryParams.push(fullName);}
if(course){updateFields.push('Course = ?');queryParams.push(course);}
if(yearLevel){updateFields.push('YearLevel = ?');queryParams.push(yearLevel);}
if(section){updateFields.push('Section = ?');queryParams.push(section);}
if(email){updateFields.push('Email = ?');queryParams.push(email);}
if(phoneNumber){updateFields.push('PhoneNumber = ?');queryParams.push(phoneNumber);}
if(password){
const hashedPassword=await bcrypt.hash(password,10);
updateFields.push('Password = ?');
queryParams.push(hashedPassword);
}
if(enrollmentStatus){updateFields.push('EnrollmentStatus = ?');queryParams.push(enrollmentStatus);}
if(accountStatus){updateFields.push('AccountStatus = ?');queryParams.push(accountStatus);}
if(updateFields.length===0){
return res.status(400).json({success:false,error:'❌ No fields to update'});
}
updateQuery+=updateFields.join(', ')+' WHERE StudentID = ?';
queryParams.push(studentID);
const [updateResult]=await db.execute(updateQuery,queryParams);
if(updateResult.affectedRows===0){
return res.status(404).json({success:false,error:'❌ Student not found'});
}
res.json({success:true,message:'✅ Student updated successfully',data:{studentID,fullName:fullName||currentStudent.FullName,email:email||currentStudent.Email}});
}));

router.post('/validate-session',asyncHandler(async(req,res)=>{
const {token}=req.body;
if(!token){
return res.status(401).json({success:false,error:'❌ Token required for session validation'});
}
try{
const decoded=jwt.verify(token,JWT_SECRET);
const selectQuery=`SELECT StudentID, FullName, Email, Course, YearLevel, Section, PhoneNumber, EnrollmentStatus, AccountStatus FROM Students WHERE StudentID = ? AND AccountStatus = 'Allowed'`;
const [results]=await db.execute(selectQuery,[decoded.studentId]);
if(results.length===0){
return res.status(401).json({success:false,error:'❌ Student not found or account not allowed'});
}
const student=results[0];
res.json({success:true,message:'✅ Session valid',data:student});
}catch(error){
console.log('❌ Token validation failed:',error.message);
return res.status(401).json({success:false,error:'❌ Invalid or expired token'});
}
}));

router.delete('/delete-student/:studentID',validateStudentId,asyncHandler(async(req,res)=>{
const {studentID}=req.params;
const deleteQuery=`DELETE FROM Students WHERE StudentID = ?`;
const [result]=await db.execute(deleteQuery,[studentID]);
if(result.affectedRows===0){
return res.status(404).json({success:false,error:'❌ Student not found.'});
}
res.json({success:true,message:`🗑️ Student with ID ${studentID} has been deleted.`});
}));

router.get('/get-student/:studentID',validateStudentId,asyncHandler(async(req,res)=>{
const {studentID}=req.params;
const selectQuery=`SELECT * FROM Students WHERE StudentID = ?`;
const [results]=await db.execute(selectQuery,[studentID]);
if(results.length===0){
return res.status(404).json({success:false,error:'❌ Student not found.'});
}
const student=results[0];
delete student.Password;
res.json({success:true,message:'✅ Student found',data:student});
}));

router.get('/get-all-students',asyncHandler(async(req,res)=>{
const selectQuery=`SELECT StudentID, FullName, Course, YearLevel, Section, Email, PhoneNumber, EnrollmentStatus, AccountStatus, CreatedAt, UpdatedAt FROM Students`;
const [results]=await db.execute(selectQuery);
res.json({success:true,message:'✅ All students retrieved',count:results.length,data:results});
}));

module.exports=router;
