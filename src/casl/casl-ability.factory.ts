import { Ability, AbilityBuilder, AbilityClass } from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

// Define action types
type Actions = 'manage' | 'create' | 'read' | 'update' | 'delete';

// Define subject types
type Subjects = 'User' | 'all';

// Define AppAbility type
export type AppAbility = Ability<[Actions, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: { role: UserRole; id: string }) {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(
      Ability as AbilityClass<AppAbility>,
    );

    // Owner role - Full permissions
    if (user.role === UserRole.OWNER) {
      can('manage', 'all'); // Full access to everything
    }

    // Admin role - (Commented for future implementation)
    // if (user.role === UserRole.ADMIN) {
    //   can('create', 'all');
    //   can('read', 'all');
    //   can('update', 'all');
    //   can('delete', User, { id: user.id }); // Can only delete own account
    // }

    // User role - (Commented for future implementation)
    // if (user.role === UserRole.USER) {
    //   can('read', User, { id: user.id }); // Can only read own data
    //   can('update', User, { id: user.id }); // Can only update own data
    //   can('delete', User, { id: user.id }); // Can only delete own account
    // }

    return build();
  }
}
