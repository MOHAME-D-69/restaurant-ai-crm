import { Router } from 'express';
import { query } from '../config/db';
import { auth, AuthRequest } from '../middleware/auth';
const router=Router();
router.get('/profile',auth,async(req:AuthRequest,res)=>{const r=await query('SELECT * FROM restaurants WHERE id=$1',[req.user!.restaurantId]);if(!r.rowCount)return res.status(404).json({message:'Restaurant not found'});res.json(r.rows[0]);});
router.put('/profile',auth,async(req:AuthRequest,res)=>{const r=await query('UPDATE restaurants SET name=COALESCE($1,name),phone=COALESCE($2,phone),address=COALESCE($3,address),description=COALESCE($4,description),working_hours=COALESCE($5,working_hours),delivery=COALESCE($6,delivery),payment_methods=COALESCE($7,payment_methods),updated_at=NOW() WHERE id=$8 RETURNING *',[req.body.name,req.body.phone,req.body.address,req.body.description,req.body.workingHours,req.body.delivery,req.body.paymentMethods,req.user!.restaurantId]);res.json(r.rows[0]);});
router.get('/knowledge',auth,async(req:AuthRequest,res)=>{const r=await query('SELECT knowledge FROM restaurants WHERE id=$1',[req.user!.restaurantId]);res.json({knowledge:r.rows[0]?.knowledge||''});});
router.put('/knowledge',auth,async(req:AuthRequest,res)=>{const r=await query('UPDATE restaurants SET knowledge=$1,updated_at=NOW() WHERE id=$2 RETURNING knowledge',[req.body.knowledge||'',req.user!.restaurantId]);res.json({knowledge:r.rows[0]?.knowledge||''});});
export default router;
