<?php

namespace Hexmedia\AdministratorBundle\Menu;

use Symfony\Component\Translation\TranslatorInterface as Translator;

abstract class Subscriber
{

	/**
	 *
	 * @var Translator
	 */
	protected $translator;

	/**
	 *
	 * @param \Hexmedia\AdministratorBundle\Menu\Event $event
	 */
	public abstract function addPositions(Event $event);

	public function __construct(Translator $translator)
	{
		$this->translator = $translator;
	}

}

?>
