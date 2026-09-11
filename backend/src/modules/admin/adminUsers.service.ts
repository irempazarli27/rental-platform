import { AppError } from "../../utils/AppError";
import { usersRepository } from "../users/users.repository";
import { toPrivateUserDto } from "../users/users.types";
import { adminActionsRepository } from "./adminActions.repository";

export const adminUsersService = {
  async list(page: number, pageSize: number, q?: string) {
    const { rows, total } = await usersRepository.listAllForAdmin(page, pageSize, q);
    return { users: rows.map(toPrivateUserDto), total, page, pageSize };
  },

  async suspend(userId: string, adminId: string, reason: string) {
    const user = await usersRepository.findById(userId);
    if (!user) throw AppError.notFound("User not found");
    if (user.role === "admin") {
      throw AppError.badRequest("Admins cannot be suspended through this endpoint", "CANNOT_SUSPEND_ADMIN");
    }

    const updated = await usersRepository.update(userId, { status: "suspended" });
    await adminActionsRepository.log({
      adminId,
      actionType: "suspend_user",
      targetType: "user",
      targetId: userId,
      notes: reason,
    });
    return toPrivateUserDto(updated);
  },

  async activate(userId: string, adminId: string) {
    const user = await usersRepository.findById(userId);
    if (!user) throw AppError.notFound("User not found");

    const updated = await usersRepository.update(userId, { status: "active" });
    await adminActionsRepository.log({
      adminId,
      actionType: "activate_user",
      targetType: "user",
      targetId: userId,
      notes: null,
    });
    return toPrivateUserDto(updated);
  },
};
