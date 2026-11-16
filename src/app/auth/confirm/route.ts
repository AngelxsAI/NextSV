import {NextResponse} from 'next/server';
import {db} from '@/lib/supabase';
export async function GET(request:Request){const url=new URL(request.url);const token_hash=url.searchParams.get('token_hash');const type=url.searchParams.get('type');if(!token_hash||!['invite','recovery'].includes(type||''))return NextResponse.redirect(new URL('/login',url.origin));const client=await db();const {error}=await client.auth.verifyOtp({token_hash,type:type as 'invite'|'recovery'});return NextResponse.redirect(new URL(error?'/login?error=enlace-invalido':'/auth/password',url.origin));}
