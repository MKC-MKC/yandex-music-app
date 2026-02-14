# Яндекс Музыка для Mac OS

[Это репо форк](https://github.com/juvirez/yandex-music-app) неофициального приложение Яндекс Музыки с исправлениями глобальных сочетаний клавиш.

### Обратите внимание, что здесь исправлены только сочетания клавиш!

> Это приложение подписывается с тестовой подписью разработчика и может работать не так как ожидали.

### Установка

Скачать приложение по ссылкам ниже и переташить в папку "Программы" / "Applications"

---

# Если не открывается программа или перестала открываться:

Выполните эти две команды:

#### ❯ Рекурсивное удаление атрибутов.

```zsh
sudo xattr -cr /Applications/Yandex\ Music\ Unofficial.app
```

#### ❯ Подписываем приложение тестовой подписью.

```zsh
sudo codesign --force --deep --sign - /Applications/Yandex\ Music\ Unofficial.app
```

---

## Скачать

Сейчас есть несколько версий приложения.
Во всех версиях исправлены глобальные сочетания клавиш.

- Последнюю версию смотрите в релизах:
    - [Открыть релизы](https://github.com/MKC-MKC/yandex-music-app/releases)

- 1.9.3 – С новым Electron 27 и остановкой музыки при (сне / закрытии крышки).
    - [для Mac Apple Silicon (ARM)](https://github.com/MKC-MKC/yandex-music-app/releases/download/1.9.3/Yandex.Music.Unofficial-1.9.3-arm64.dmg)
    - [для Mac Intel](https://github.com/MKC-MKC/yandex-music-app/releases/download/1.9.3/Yandex.Music.Unofficial-1.9.3.dmg)

- 1.9.2 – С новым Electron 27
    - [для Mac Apple Silicon (ARM)](https://github.com/MKC-MKC/yandex-music-app/releases/download/1.9.2/Yandex.Music.Unofficial-1.9.2-arm64.dmg)
    - [для Mac Intel](https://github.com/MKC-MKC/yandex-music-app/releases/download/1.9.2/Yandex.Music.Unofficial-1.9.2.dmg)

- 1.9.1 – С старым Electron 19
    - [для Mac Apple Silicon (ARM)](https://github.com/MKC-MKC/yandex-music-app/releases/download/1.9.1/Yandex.Music.Unofficial-1.9.1-arm64.dmg)
    - [для Mac Intel](https://github.com/MKC-MKC/yandex-music-app/releases/download/1.9.1/Yandex.Music.Unofficial-1.9.1.dmg)
