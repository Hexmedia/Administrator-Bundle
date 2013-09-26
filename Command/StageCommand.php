<?php

namespace Hexmedia\AdministratorBundle\Command;

use Symfony\Bundle\FrameworkBundle\Command\ContainerAwareCommand;
use Symfony\Component\Console\Input\ArgvInput;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\Process\Process;

class StageCommand extends ContainerAwareCommand {

	protected function configure() {
		parent::configure();

		$this
			->setName('hexmedia:stage')
			->setDescription("Prepares version for staging")
		;
	}

	protected function execute(InputInterface $input, OutputInterface $output) {
        $this->getApplication()->find("bazinga:expose-translation:dump")->run($this->getDefaultInput($input), $output);
        $this->getApplication()->find("fos:js-routing:dump")->run($this->getDefaultInput($input), $output);
        $this->getApplication()->find("fos:js-routing:dump")->run($this->getDefaultInput($input), $output);
        $this->getApplication()->find("assets:install")->run($this->getDefaultInput($input), $output);
        $this->getApplication()->find("assetic:dump")->run($this->getDefaultInput($input), $output);
        $this->getApplication()->find("cache:clear")->run($this->getDefaultInput($input), $output);
	}

    private function getDefaultInput(InputInterface $input) {
//        $newInput = new ArgvInput();

//        $newInput->setOption("env", $input->getOption("env"));

        return $input; //$newInput;
    }

}

