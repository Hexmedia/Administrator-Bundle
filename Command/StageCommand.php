<?php

namespace Hexmedia\KnockoutBootstrapBundle\Command;

use Symfony\Bundle\FrameworkBundle\Command\ContainerAwareCommand;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Hexmedia\BootstrapBundle\File\Symlink;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\Process\Process;

class CompileCommand extends ContainerAwareCommand {

	protected function configure() {
		parent::configure();

		$this
			->setName('hexmedia:knockout-bootstrap:compile')
			->setDescription("Compiles knockout-bootstrap bundle")
		;
	}

	protected function execute(InputInterface $input, OutputInterface $output) {
		$this->executeCommand("/usr/bin/grunt", 300, false);
		$this->executeCommand("/usr/local/bin/grunt", 300, false);
	}

	protected function executeCommand($cmd, $timeout = 300, $required = true) {
		$process = new Process("$cmd", $this->getContainer()->get('kernel')->locateResource("@HexmediaKnockoutBootstrapBundle/Resources/knockout-bootstrap"), null, null, $timeout);
		$process->run(function ($type, $buffer) {
				echo $buffer;
			});
		if ($required && !$process->isSuccessful()) {
			throw new \RuntimeException(sprintf('An error occurred when executing the "%s" command.', escapeshellarg($cmd)));
		}
	}

}

