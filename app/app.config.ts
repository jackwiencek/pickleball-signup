export default defineAppConfig({
    ui: {
        colors: {
            primary: 'sky',
            secondary: 'zinc',
            neutral: 'slate'
        },
        formField: {
            slots: {
                // Default: 'block font-medium text-default'
                // Replace text-default with your color:
                label: 'block font-medium text-primary-400'
            }
        },
        input: {
            slots: {
                // You need the full base styling, then add your bg color
                base: 'w-full rounded-md border-0 placeholder:text-secondary'
            }
        },
        select: {
            slots: {
                base: 'w-full rounded-md border-0',
                placeholder: 'text-secondary',
                content: 'bg-muted'
            }
        }
    }
})