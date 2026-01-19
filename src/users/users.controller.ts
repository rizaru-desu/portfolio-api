import {
  Controller,
  Get,
  Param,
  Delete,
  UseGuards,
  Query,
  Patch,
  Body,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async findAll(@Query('skip') skip?: string, @Query('take') take?: string) {
    return this.usersService.findAll({
      skip: Number(skip) || 0,
      take: Number(take) || 10,
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async update(
    @Param('id') id: string,
    @Body() data: { role?: UserRole; name?: string },
    @CurrentUser() currentUser: any,
  ) {
    // Prevent modifying own role unless Owner
    if (
      id === currentUser.id &&
      data.role &&
      currentUser.role !== UserRole.OWNER
    ) {
      throw new UnauthorizedException('Cannot modify your own role');
    }
    return this.usersService.updateUser(id, data);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  async remove(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
