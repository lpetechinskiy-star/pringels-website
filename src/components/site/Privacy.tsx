import { useEffect, useRef, type ReactNode } from "react"
import { X } from "lucide-react"
import { lenis } from "@/experience/Experience"

const UPDATED = "5 октября 2026"

const SECTIONS: { title: string; body: ReactNode }[] = [
  {
    title: "Кратко",
    body: (
      <p>
        Litenergles — вымышленный бренд, а этот сайт — концепт интерактивной кампании для портфолио. Сайт ничего не
        продаёт, не просит регистрироваться и не собирает ваши персональные данные.
      </p>
    ),
  },
  {
    title: "Какие данные мы собираем",
    body: (
      <>
        <p>Никаких. На сайте нет форм, аккаунтов, рассылок и комментариев, поэтому вводить что-либо не нужно.</p>
        <p>
          Сайт не использует cookies, аналитику, рекламные пиксели и трекеры, не сохраняет данные в хранилище браузера и
          не отправляет никуда запросы. Шрифты и всё оформление загружаются вместе со страницей.
        </p>
      </>
    ),
  },
  {
    title: "Что происходит в браузере",
    body: (
      <p>
        Выбранный вкус, счётчик брошенных чипсов и настройка «Меньше движения» живут только в памяти открытой вкладки и
        исчезают, когда вы её закрываете. Движения мыши, касания и прокрутка используются только для анимации и никуда не
        передаются.
      </p>
    ),
  },
  {
    title: "Хостинг",
    body: (
      <p>
        Сервис, на котором размещена страница, может автоматически записывать технические данные о запросе — например,
        IP-адрес, тип браузера и время визита. Это происходит на его стороне и регулируется его собственной политикой
        конфиденциальности. Мы к этим данным доступа не получаем.
      </p>
    ),
  },
  {
    title: "Ссылки",
    body: (
      <p>
        Кнопки «Найти в магазине» и «#ГиперболаВкуса» никуда не ведут: магазина и соцсетей у вымышленного бренда нет.
      </p>
    ),
  },
  {
    title: "Изменения",
    body: <p>Если сайт начнёт собирать какие-либо данные, мы обновим этот текст и дату редакции.</p>,
  },
]

/**
 * The privacy policy, in a native modal dialog (focus trap and Esc for free).
 * Opens from the footer link or straight from a #privacy link.
 */
export function Privacy({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      lenis?.stop()
    } else if (!open && d.open) d.close()
    if (!open) lenis?.start()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby="privacy-title"
      onClose={onClose}
      onClick={(e) => {
        // a click on the backdrop closes it
        if (e.target === e.currentTarget) onClose()
      }}
      className="m-auto h-[min(48rem,calc(100dvh-2rem))] w-[min(46rem,calc(100vw-2rem))] max-w-none overflow-clip rounded-[28px] bg-paper p-0 text-ink shadow-2xl backdrop:bg-night/80 backdrop:backdrop-blur-sm"
    >
      <div className="flex h-full flex-col">
        <header className="relative border-b border-ink/10 px-6 pb-4 pt-6 md:px-10 md:pt-8">
          <div className="min-w-0">
            <p className="eyebrow pr-16 text-brand">litenergles</p>
            <h2 id="privacy-title" className="mt-2 font-display text-[1.05rem] font-extrabold leading-tight tracking-[-0.03em] [overflow-wrap:anywhere] [text-wrap:balance] sm:text-[clamp(1.5rem,4vw,2.2rem)]">
              Политика конфиденциальности
            </h2>
            <p className="mt-1 text-sm text-ink/60">Редакция от {UPDATED}</p>
          </div>
          <button type="button" onClick={onClose} className="round-btn absolute right-4 top-4 border-ink/30 md:right-6 md:top-6" aria-label="Закрыть политику конфиденциальности">
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>
        <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overflow-x-clip overscroll-contain px-6 py-6 md:px-10">
          <ol className="space-y-7">
            {SECTIONS.map((s, i) => (
              <li key={s.title}>
                <h3 className="flex items-baseline gap-3 font-display text-lg font-bold tracking-[-0.02em]">
                  <span className="eyebrow tabular-nums text-brand">{i + 1 < 10 ? "0" + (i + 1) : i + 1}</span>
                  {s.title}
                </h3>
                <div className="mt-2 max-w-[62ch] space-y-3 text-[1rem] leading-relaxed text-ink/80">{s.body}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </dialog>
  )
}
