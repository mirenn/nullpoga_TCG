import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

// TODO: 認証関連の改善が必要
// 以下いずれかが必要。今はユーザー名のみでログイン可能、他社が同名のユーザーでログイン可能
// - ユーザー名の重複チェックの実装
// - パスワード認証の追加（パスワードのハッシュ化含む）
// - ユーザーIDの生成方法の改善（UUIDなどの一意な識別子の使用）

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: { username: string }) {
    // 簡易的な実装として、usernameのみでログインを許可
    // 本番環境ではパスワード認証などを追加する必要があります
    const user = {
      username: loginDto.username,
      userId: loginDto.username // 簡易的な実装としてusernameをuserIdとして使用
    };
    return this.authService.login(user);
  }
}