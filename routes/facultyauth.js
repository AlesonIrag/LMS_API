const express=require('express');
const router=express.Router();
const bcrypt=require('bcryptjs');
const db=require('../config/database');
const {validateFacultyRegistration,validateFacultyUpdate,validateFacultyId,validateFacultyLogin}=require('../middleware/validation');
const {asyncHandler}=require('../middleware/errorHandler');

const logFacultyAction=async(facultyId,action,affectedTable=null,affectedId=null)=>{
try{
const logQuery=`INSERT INTO facultyauditlogs (FacultyID, Action, AffectedTable, AffectedID) VALUES (?, ?, ?, ?)`;
await db.execute(logQuery,[facultyId,action,affectedTable,affectedId]);
}catch(error){
console.error('Failed to log faculty action:',error);
}
};

router.post('/register-faculty',validateFacultyRegistration,asyncHandler(async(req,res)=>{
const {facultyId,fullName,email,phoneNumber,password,department,position,status='Active'}=req.body;
const facultyIdPattern=/^\d{4}-\d{5,6}$/;
if(!facultyIdPattern.test(facultyId)){
return res.status(400).json({success:false,error:'❌ Faculty ID must be in format YYYY-NNNNN or YYYY-NNNNNN (e.g., 2022-99999 or 2022-000001)'});
}
const checkQuery=`SELECT FacultyID FROM faculty WHERE FacultyID = ?`;
const [existingFaculty]=await db.execute(checkQuery,[facultyId]);
if(existingFaculty.length>0){
return res.status(409).json({success:false,error:'❌ Faculty ID already exists. Please use a different ID.'});
}
const hashedPassword=await bcrypt.hash(password,10);
const insertQuery=`INSERT INTO faculty (FacultyID, FullName, Email, PhoneNumber, Password, Department, Position, Status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
const [result]=await db.execute(insertQuery,[facultyId,fullName,email,phoneNumber,hashedPassword,department,position,status]);
await logFacultyAction(facultyId,`Faculty account created - ID: ${facultyId}, Department: ${department}, Position: ${position}`,'faculty',facultyId);
res.status(201).json({success:true,message:'✅ Faculty registered successfully',data:{facultyID:facultyId,fullName,email,department,position,status}});
}));

router.post('/login-faculty',validateFacultyLogin,asyncHandler(async(req,res)=>{
const {facultyId,password}=req.body;
const selectQuery=`SELECT * FROM faculty WHERE FacultyID = ? AND Status = 'Active'`;
const [results]=await db.execute(selectQuery,[facultyId]);
if(results.length===0){
return res.status(401).json({success:false,error:'❌ Invalid credentials or account inactive'});
}
const faculty=results[0];
const isPasswordValid=await bcrypt.compare(password,faculty.Password);
if(!isPasswordValid){
return res.status(401).json({success:false,error:'❌ Invalid credentials'});
}
await logFacultyAction(faculty.FacultyID,'Faculty login');
res.json({success:true,message:'✅ Faculty login successful',data:{facultyID:faculty.FacultyID,fullName:faculty.FullName,department:faculty.Department,position:faculty.Position}});
}));

router.get('/get-faculty/:facultyID',validateFacultyId,asyncHandler(async(req,res)=>{
const {facultyID}=req.params;
const selectQuery=`SELECT FacultyID, FullName, Email, PhoneNumber, Department, Position, Status, CreatedAt, UpdatedAt FROM faculty WHERE FacultyID = ?`;
const [results]=await db.execute(selectQuery,[facultyID]);
if(results.length===0){
return res.status(404).json({success:false,error:'❌ Faculty not found'});
}
res.json({success:true,message:'✅ Faculty retrieved successfully',data:results[0]});
}));

router.get('/get-all-faculty',asyncHandler(async(req,res)=>{
const {limit=50,offset=0}=req.query;
const selectQuery=`SELECT FacultyID, FullName, Email, PhoneNumber, Department, Position, Status, CreatedAt, UpdatedAt FROM faculty ORDER BY FullName ASC LIMIT ? OFFSET ?`;
const [results]=await db.execute(selectQuery,[parseInt(limit),parseInt(offset)]);
res.json({success:true,message:'✅ All faculty retrieved successfully',count:results.length,data:results});
}));

router.get('/get-faculty-by-department/:department',asyncHandler(async(req,res)=>{
const {department}=req.params;
const selectQuery=`SELECT FacultyID, FullName, Email, PhoneNumber, Department, Position, Status, CreatedAt, UpdatedAt FROM faculty WHERE Department = ? ORDER BY FullName ASC`;
const [results]=await db.execute(selectQuery,[department]);
res.json({success:true,message:`✅ Faculty from ${department} retrieved successfully`,count:results.length,data:results});
}));

router.get('/get-faculty-by-position/:position',asyncHandler(async(req,res)=>{
const {position}=req.params;
const selectQuery=`SELECT FacultyID, FullName, Email, PhoneNumber, Department, Position, Status, CreatedAt, UpdatedAt FROM faculty WHERE Position = ? ORDER BY Department, FullName ASC`;
const [results]=await db.execute(selectQuery,[position]);
res.json({success:true,message:`✅ Faculty with position ${position} retrieved successfully`,count:results.length,data:results});
}));

router.put('/update-faculty/:facultyID',validateFacultyUpdate,asyncHandler(async(req,res)=>{
const {facultyID}=req.params;
const {fullName,email,phoneNumber,password,department,position,status}=req.body;
const checkQuery=`SELECT * FROM faculty WHERE FacultyID = ?`;
const [results]=await db.execute(checkQuery,[facultyID]);
if(results.length===0){
return res.status(404).json({success:false,error:'❌ Faculty not found'});
}
const currentFaculty=results[0];
let updateQuery=`UPDATE faculty SET `;
let queryParams=[];
let updateFields=[];
if(fullName){updateFields.push('FullName = ?');queryParams.push(fullName);}
if(email){updateFields.push('Email = ?');queryParams.push(email);}
if(phoneNumber){updateFields.push('PhoneNumber = ?');queryParams.push(phoneNumber);}
if(password){
const hashedPassword=await bcrypt.hash(password,10);
updateFields.push('Password = ?');
queryParams.push(hashedPassword);
}
if(department){updateFields.push('Department = ?');queryParams.push(department);}
if(position){updateFields.push('Position = ?');queryParams.push(position);}
if(status){updateFields.push('Status = ?');queryParams.push(status);}
if(updateFields.length===0){
return res.status(400).json({success:false,error:'❌ No fields to update'});
}
updateQuery+=updateFields.join(', ')+' WHERE FacultyID = ?';
queryParams.push(facultyID);
const [updateResult]=await db.execute(updateQuery,queryParams);
if(updateResult.affectedRows===0){
return res.status(404).json({success:false,error:'❌ Faculty not found'});
}
const changes=[];
if(fullName&&fullName!==currentFaculty.FullName)changes.push(`Name: ${currentFaculty.FullName} → ${fullName}`);
if(email&&email!==currentFaculty.Email)changes.push(`Email: ${currentFaculty.Email} → ${email}`);
if(phoneNumber&&phoneNumber!==currentFaculty.PhoneNumber)changes.push(`Phone: ${currentFaculty.PhoneNumber} → ${phoneNumber}`);
if(department&&department!==currentFaculty.Department)changes.push(`Department: ${currentFaculty.Department} → ${department}`);
if(position&&position!==currentFaculty.Position)changes.push(`Position: ${currentFaculty.Position} → ${position}`);
if(status&&status!==currentFaculty.Status)changes.push(`Status: ${currentFaculty.Status} → ${status}`);
if(password)changes.push('Password updated');
await logFacultyAction(facultyID,`Faculty profile updated: ${changes.join(', ')}`,'faculty',facultyID);
res.json({success:true,message:'✅ Faculty updated successfully',data:{facultyID,fullName:fullName||currentFaculty.FullName,email:email||currentFaculty.Email,department:department||currentFaculty.Department,position:position||currentFaculty.Position,status:status||currentFaculty.Status}});
}));

router.delete('/delete-faculty/:facultyID',validateFacultyId,asyncHandler(async(req,res)=>{
const {facultyID}=req.params;
const checkQuery=`SELECT * FROM faculty WHERE FacultyID = ?`;
const [results]=await db.execute(checkQuery,[facultyID]);
if(results.length===0){
return res.status(404).json({success:false,error:'❌ Faculty not found'});
}
const faculty=results[0];
await logFacultyAction(facultyID,`Faculty account deleted - ${faculty.FullName} (${faculty.Department}, ${faculty.Position})`,'faculty',facultyID);
const deleteQuery=`DELETE FROM faculty WHERE FacultyID = ?`;
const [deleteResult]=await db.execute(deleteQuery,[facultyID]);
if(deleteResult.affectedRows===0){
return res.status(404).json({success:false,error:'❌ Faculty not found'});
}
res.json({success:true,message:'✅ Faculty deleted successfully',data:{facultyID,deletedFaculty:{fullName:faculty.FullName,email:faculty.Email,department:faculty.Department,position:faculty.Position}}});
}));

router.get('/faculty-audit-logs',asyncHandler(async(req,res)=>{
const {limit=50,offset=0}=req.query;
const selectQuery=`SELECT fal.LogID, fal.FacultyID, f.FullName as FacultyName, f.Department as FacultyDepartment, f.Position as FacultyPosition, fal.Action, fal.AffectedTable, fal.AffectedID, fal.Timestamp FROM facultyauditlogs fal LEFT JOIN faculty f ON fal.FacultyID = f.FacultyID ORDER BY fal.Timestamp DESC LIMIT ? OFFSET ?`;
const [results]=await db.execute(selectQuery,[parseInt(limit),parseInt(offset)]);
res.json({success:true,message:'✅ Faculty audit logs retrieved successfully',count:results.length,data:results});
}));

router.get('/faculty-audit-logs/:facultyID',asyncHandler(async(req,res)=>{
const {facultyID}=req.params;
const {limit=50,offset=0}=req.query;
const selectQuery=`SELECT fal.LogID, fal.FacultyID, f.FullName as FacultyName, f.Department as FacultyDepartment, f.Position as FacultyPosition, fal.Action, fal.AffectedTable, fal.AffectedID, fal.Timestamp FROM facultyauditlogs fal LEFT JOIN faculty f ON fal.FacultyID = f.FacultyID WHERE fal.FacultyID = ? ORDER BY fal.Timestamp DESC LIMIT ? OFFSET ?`;
const [results]=await db.execute(selectQuery,[facultyID,parseInt(limit),parseInt(offset)]);
res.json({success:true,message:'✅ Faculty audit logs retrieved successfully',count:results.length,data:results});
}));

router.post('/change-faculty-password/:facultyID',validateFacultyId,asyncHandler(async(req,res)=>{
const {facultyID}=req.params;
const {currentPassword,newPassword}=req.body;
if(!currentPassword||!newPassword){
return res.status(400).json({success:false,error:'❌ Current password and new password are required'});
}
const passwordRegex=/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
if(!passwordRegex.test(newPassword)){
return res.status(400).json({success:false,error:'❌ New password must be at least 6 characters long and contain at least one lowercase letter, one uppercase letter, and one number'});
}
const selectQuery=`SELECT * FROM faculty WHERE FacultyID = ?`;
const [results]=await db.execute(selectQuery,[facultyID]);
if(results.length===0){
return res.status(404).json({success:false,error:'❌ Faculty not found'});
}
const faculty=results[0];
const isCurrentPasswordValid=await bcrypt.compare(currentPassword,faculty.Password);
if(!isCurrentPasswordValid){
return res.status(401).json({success:false,error:'❌ Current password is incorrect'});
}
const hashedNewPassword=await bcrypt.hash(newPassword,10);
const updateQuery=`UPDATE faculty SET Password = ? WHERE FacultyID = ?`;
await db.execute(updateQuery,[hashedNewPassword,facultyID]);
await logFacultyAction(facultyID,'Password changed','faculty',facultyID);
res.json({success:true,message:'✅ Password changed successfully'});
}));

module.exports=router;