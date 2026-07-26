# Яндекс Музыка для Mac OS

[Это репо форк](https://github.com/juvirez/yandex-music-app) неофициального приложение Яндекс Музыки с исправлениями
глобальных сочетаний клавиш.

### Обратите внимание, что здесь исправлены только сочетания клавиш!

> Это приложение подписывается с тестовой подписью разработчика и может работать не так как ожидали.

### Установка

Скачать приложение по ссылкам ниже и перетащить в папку "Программы" / "Applications"

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

- 1.9.6 – Фикс отключения "Волны"/Vibe.
    - [для Mac Apple Silicon (ARM)](https://github.com/MKC-MKC/yandex-music-app/releases/download/1.9.6/Yandex.Music.Unofficial-1.9.6-arm64.dmg)
    - [для Mac Intel](https://github.com/MKC-MKC/yandex-music-app/releases/download/1.9.6/Yandex.Music.Unofficial-1.9.6.dmg)
