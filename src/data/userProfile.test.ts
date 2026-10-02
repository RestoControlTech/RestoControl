/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import { useAuthStore } from '../auth/auth.store';

async function runUserProfileTests() {
  console.log('--- Testing User Profile Management & Avatar Persistence ---');

  const authStore = useAuthStore.getState();

  // 1. Log in as an admin user
  const loginRes = authStore.login('panbunhen58@gmail.com', 'Heng1111');
  assert.strictEqual(loginRes.success, true, 'Admin login must succeed');

  const initialUser = useAuthStore.getState().user;
  assert.ok(initialUser, 'User must be authenticated');
  assert.strictEqual(initialUser?.name, 'Pan Bunheng');

  // 2. Test updating profile info (name and phone)
  useAuthStore.getState().updateUser({
    name: 'Pan Bunheng (Owner)',
    phone: '+855 12 999 888',
  });

  const updatedUser1 = useAuthStore.getState().user;
  assert.strictEqual(updatedUser1?.name, 'Pan Bunheng (Owner)');
  assert.strictEqual(updatedUser1?.phone, '+855 12 999 888');
  assert.strictEqual(updatedUser1?.role, 'admin', 'Role must remain unchanged');
  console.log('✓ Profile name and phone update verified');

  // 3. Test drag-and-drop avatar update
  const sampleAvatarUrl = 'https://res.cloudinary.com/cc67bunh/image/upload/v12345/avatar.png';
  useAuthStore.getState().updateUser({
    avatar: sampleAvatarUrl,
    avatarPublicId: 'restocontrol_avatars/test-avatar-id',
  });

  const updatedUser2 = useAuthStore.getState().user;
  assert.strictEqual(updatedUser2?.avatar, sampleAvatarUrl);
  assert.strictEqual(updatedUser2?.avatarPublicId, 'restocontrol_avatars/test-avatar-id');
  console.log('✓ Avatar URL and Public ID persistence verified');

  // 4. Test clearing/removing avatar
  useAuthStore.getState().updateUser({
    avatar: '',
    avatarPublicId: undefined,
  });

  const updatedUser3 = useAuthStore.getState().user;
  assert.strictEqual(updatedUser3?.avatar, '');
  assert.strictEqual(updatedUser3?.avatarPublicId, undefined);
  console.log('✓ Avatar reset/remove verified');

  // 5. Restore original state
  useAuthStore.getState().updateUser({
    name: 'Pan Bunheng',
    phone: undefined,
    avatar: undefined,
    avatarPublicId: undefined,
  });

  console.log('✔ All user profile tests passed successfully!');
}

runUserProfileTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
