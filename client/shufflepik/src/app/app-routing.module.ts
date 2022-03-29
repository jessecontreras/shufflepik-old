//Angular level imports
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

//App level imports
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { PhotoAlbumsComponent } from './photo-albums/photo-albums.component';
import { AlbumComponent } from './album/album.component';
import { AuthGuard } from './_helpers/auth.guard';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { ThanksBotDownloadComponent } from './thanks-bot-download/thanks-bot-download.component';
import { KeyEventComponent } from './key-event/key-event.component';
import { TermsComponent } from './terms/terms.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { UserSettingsComponent } from './user-settings/user-settings.component';

const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home/:id', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'thanks-bot-download', component: ThanksBotDownloadComponent },
  { path: 'terms', component: TermsComponent },
  { path: 'privacy-policy', component: PrivacyPolicyComponent },
  {
    path: 'user-settings',
    component: UserSettingsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'photo-albums',
    component: PhotoAlbumsComponent,
    canActivate: [AuthGuard],
  },
  { path: 'album/:id', component: AlbumComponent, canActivate: [AuthGuard] },
  { path: 'reset-password/:id', component: ResetPasswordComponent },
  // otherwise redirect to home
  { path: '**', redirectTo: '' },
];
@NgModule({
  imports: [RouterModule.forRoot(routes, { anchorScrolling: 'enabled' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
