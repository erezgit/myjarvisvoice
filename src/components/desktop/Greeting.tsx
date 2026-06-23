import { motion } from 'framer-motion';

interface GreetingProps {
  onSendMessage?: (message: string) => void;
}

export const Greeting = ({ onSendMessage }: GreetingProps) => {
  const handleSayHi = () => {
    if (onSendMessage) {
      onSendMessage('Hi');
    }
  };

  return (
    <div
      key="overview"
      className="max-w-3xl mx-auto px-4 size-full flex flex-col justify-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
        className="text-2xl font-semibold"
      >
        Hello there!
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
        className="text-2xl text-zinc-500"
      >
        How can I help you today?
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.7 }}
        className="mt-4"
      >
        <button
          onClick={handleSayHi}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
          style={{ backgroundColor: 'hsl(140.6, 84.2%, 92.5%)', color: '#000' }}
        >
          Say Hi
        </button>
      </motion.div>
    </div>
  );
};
