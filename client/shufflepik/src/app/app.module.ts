import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AngularMaterialModule } from './material/material.module';
import { RouterModule } from '@angular/router';
import { AppRoutingModule } from './app-routing.module';

import { AppComponent } from './app.component';
import { DialogComponent } from './dialog/dialog.component';
import { AlbumComponent } from './album/album.component';
import { ErrorDownloadingBotComponent } from './error-downloading-bot/error-downloading-bot.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { HeaderComponent } from './header/header.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { PhotoAlbumsComponent } from './photo-albums/photo-albums.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { ThanksBotDownloadComponent } from './thanks-bot-download/thanks-bot-download.component';
import { httpInterceptorProviders } from './_interceptors';
import { ImageComponent } from './image/image.component';
import { KeyEventComponent } from './key-event/key-event.component';
import { TermsComponent } from './terms/terms.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { UserSettingsComponent } from './user-settings/user-settings.component';
import { AuthImagePipe } from './_pipes/auth-image.pipe';
import { UploadDirective } from './_directives/upload.directive';
//import { ImageLoadCheckDirective } from './_directives/image-load-check.directive';
@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    DialogComponent,
    AlbumComponent,
    ErrorDownloadingBotComponent,
    ForgotPasswordComponent,
    HeaderComponent,
    LoginComponent,
    RegisterComponent,
    PhotoAlbumsComponent,
    ResetPasswordComponent,
    ThanksBotDownloadComponent,
    ImageComponent,
    KeyEventComponent,
    TermsComponent,
    PrivacyPolicyComponent,
    UserSettingsComponent,
    AuthImagePipe,
    UploadDirective,
   // ImageLoadCheckDirective,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    AngularMaterialModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule,
  ],
  providers: [httpInterceptorProviders],
  bootstrap: [AppComponent],
})
export class AppModule {}
