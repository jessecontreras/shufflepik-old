import { Component, Inject, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-thanks-bot-download',
  templateUrl: './thanks-bot-download.component.html',
  styleUrls: ['./thanks-bot-download.component.scss'],
})
export class ThanksBotDownloadComponent implements OnInit {
  constructor(@Inject(DOCUMENT) private document: Document) {}

  goToDiscord() {
    this.document.location.href = 'https://discord.com/app';
  }

  ngOnInit(): void {}
}
