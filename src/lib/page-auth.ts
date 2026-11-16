import 'server-only';
import {redirect} from 'next/navigation';
import {requireStaff} from './supabase';
export async function requirePageStaff(permission?:string){try{return await requireStaff(permission);}catch{redirect('/login');}}
