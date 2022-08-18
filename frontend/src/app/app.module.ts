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
import { TermsComponent } from './terms/terms.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { UserSettingsComponent } from './user-settings/user-settings.component';
import { AuthImagePipe } from './_pipes/auth-image.pipe';
import { UploadDirective } from './_directives/upload.directive';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { SpSnackBarComponent } from './sp-snackbar/sp-snackbar.component';
import { ParseDatePipe } from './_pipes/parse-date.pipe';
import { FormatDatePipe } from './_pipes/format-date.pipe';
import { FaqComponent } from './faq/faq.component';
import { EmailValidationSuccessfulComponent } from './email-validation-successful/email-validation-successful.component';
import { LazyImgLoadDirective } from './_directives/lazy-img-load.directive';
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
    TermsComponent,
    PrivacyPolicyComponent,
    UserSettingsComponent,
    AuthImagePipe,
    UploadDirective,
    SpSnackBarComponent,
    ParseDatePipe,
    FormatDatePipe,
    FaqComponent,
    EmailValidationSuccessfulComponent,
    LazyImgLoadDirective,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    AngularMaterialModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000',
    }),
    RouterModule,
  ],
  providers: [httpInterceptorProviders],
  bootstrap: [AppComponent],
})
export class AppModule {}
