
'use server';
import prisma from '@/lib/prisma';

export async function grantAdminRole(userId: string) {
  try {
    await prisma.user.update({ where: { id: userId }, data: { is_admin: true } });
    return { success: true, message: `User ${userId} has been granted admin privileges.` };
  } catch (error: any) {
    console.error('Error granting admin role:', error);
    return { success: false, message: error.message || 'An unknown error occurred while granting admin role.' };
  }
}
